package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import java.util.Set
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.NamedEntity
import jakarta.persistence.CascadeType
    @Column(name = "birth_date")
    @DateTimeFormat(pattern = "yyyy-MM" .Date)
    private var birthDate: LocalDate?

    // type field remains the same

    // visits must be initialized — but note that in Java it's done via field initializer.
    // We can use an expression for initialization:

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "pet_id")
    @OrderBy("date ASC")
    private val visits: Set<Visit>   // This is non-null because of the field initializer

}