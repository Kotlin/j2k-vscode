
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import java.util.ArrayList
import java.util.List

import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import org.springframework.util.Assert

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.NotBlank

/**
 * Simple JavaBean domain object representing an owner.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Michael Isvy
 * @author Oliver Drotbohm
 * @author Wick Dynex
 *
 * @property address the owner's address
 * @property city the owner's city
 * @property telephone the owner's telephone number
 * @property pets the list of pets owned by this owner
 */
@Entity
@Table(name = "owners")
open class Owner : Person() {

	@Column(name = "address")
	@NotBlank
	var address: String? = null

	@Column(name = "city")
	@NotBlank
	var city: String? = null

	@Column(name = "telephone")
	@NotBlank
	@Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
	var telephone: String? = null

	@OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
	@JoinColumn(name = "owner_id")
	@OrderBy("name")
	val pets: MutableList<Pet> = ArrayList()

	fun addPet(pet: Pet) {
		if (pet.isNew()) {
			pets.add(pet)
		}
	}

	/**
	 * Return the Pet with the given name, or null if none found for this Owner.
	 * @param name to test
	 * @return the Pet with the given name, or null if no such Pet exists for this Owner
	 */
	fun getPet(name: String): Pet? {
		return getPet(name, false)
	}

	/**
	 * Return the Pet with the given id, or null if none found for this Owner.
	 * @param id to test
	 * @return the Pet with the given id, or null if no such Pet exists for this Owner
	 */
	fun getPet(id: Integer): Pet? {
		return pets.find { pet -> !pet.isNew() && pet.getId() == id }
	}

	/**
	 * Return the Pet with the given name, or null if none found for this Owner.
	 * @param name to test
	 * @param ignoreNew whether to ignore new pets (pets that are not saved yet)
	 * @return the Pet with the given name, or null if no such Pet exists for this Owner
	 */
	fun getPet(name: String, ignoreNew: Boolean): Pet? {
		return pets.find { pet ->
			val compName = pet.getName()
			compName != null && compName.equals(name, ignoreCase = true) && (!ignoreNew || !pet.isNew())
		}
	}

	override fun toString(): String {
		return ToStringCreator(this).append("id", this.getId())
			.append("new", this.isNew())
			.append("lastName", this.getLastName())
			.append("firstName", this.getFirstName())
			.append("address", this.address)
			.append("city", this.city)
			.append("telephone", this.telephone)
			.toString()
	}

	/**
	 * Adds the given [Visit] to the [Pet] with the given identifier.
	 * @param petId the identifier of the [Pet], must not be `null`.
	 * @param visit the visit to add, must not be `null`.
	 */
	fun addVisit(petId: Integer, visit: Visit) {
		val pet = getPet(petId)
		Assert.notNull(pet, "Invalid Pet identifier!")
		pet!!.addVisit(visit)
	}
}
