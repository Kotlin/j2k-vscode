// 2025-07-22T08:47:55.356Z (logged at)

package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank

@Entity
@Table(name = "visits")
data class Visit(
    @get:Column(name = "visit_date")
    @set:DateTimeFormat(pattern = "yyyy-MM-dd")
    var date: LocalDate,

    @get:NotBlank
    var description: String
) : BaseEntity() {

    constructor() : this(LocalDate.now(), "")
}
